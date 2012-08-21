#!/usr/bin/perl
package STVBallot::ConnectionManager;
use Modern::Perl;
use Data::Dump;
use STVBallot::BallotApp qw(lh);
use JSON;
use Net::Rendezvous::Publish;
use Net::Bonjour;
use Encode;
use Crypt::RSA;
use Crypt::CBC;
use Digest::MD5 qw(md5_base64);
use Wx qw(:socket);
use Wx::Socket;
use Wx::Event qw(EVT_COMMAND EVT_SOCKET_INPUT EVT_SOCKET_LOST EVT_SOCKET_CONNECTION) ;

use constant SERVICE_PORT => 51432;
my $DONE_EVENT : shared = Wx::NewEventType;

sub new {
    my $class = shift;
    my $app_control = shift;
    my $self = {app_control => $app_control};
    bless $self, $class;
    if ($app_control->{app_mode} eq 'server') {
        $self->{clients} = {};
        $self->{client_names} = {};
        $self->_start_server($app_control);
        $self->_publish_server_async($app_control);
    }
    return $self;
}

sub find_servers_async {
    my ($self, $widget, $cb) = @_; @_ = ();
    EVT_COMMAND($widget, -1, $DONE_EVENT, sub {
        my ($widget, $command) = @_;
        my $response = decode_json($command->GetData());
        $cb->($response);
    });
    threads->create(sub {
        my $result : shared;
        my @servers = map {
            address => $_->address,
            name => decode_utf8($_->txtdata()->[0]),
            sec_code => $_->txtdata->[1]
        }, $self->_discover_servers();
        $result = encode_json([@servers]);
        my $threvent = new Wx::PlThreadEvent( -1, $DONE_EVENT, $result);
        Wx::PostEvent($widget, $threvent);
    })->detach();
}

sub join_session {
    my ($self, $session) = @_;
    my $app_control = $self->{app_control};
    $self->{enc_key} = rand;
    my $sock = Wx::SocketClient->new(wxSOCKET_WAITALL);
    EVT_SOCKET_LOST($app_control->{app} , $sock , sub {
        ddx "Connection lost, reconnecting";
        join_session($session);
    });
    $sock->Connect($session->{address}, SERVICE_PORT);
    if (! $sock->IsConnected ) { ddx "ERROR", $sock;}
    $self->{socket} = $sock;
    $sock->WriteMsg(encode_json({command => 'get_public_key', cname => $app_control->{user_name}}) . "\n");
    ddx "key requested";
    my $server_key = _readMsg($sock);
    ddx "key received: $server_key";
    if ($server_key =~ /Error/) {
        return $server_key;
    }
    my $key = new Crypt::RSA::Key::Public()->deserialize($server_key);
    $self->{server_key} = $key;
    md5_base64($key) eq $session->{sec_code} or die "security code mismatch";
    $sock->WriteMsg(encode_json({command => 'set_enc_key', enc_key => $key->encrypt($self->{enc_key})}) . "\n");
    my $confirmation = _readMsg($sock);
    $confirmation =~ /OK/ or die "Couldn't set encryption key: $confirmation";
    EVT_SOCKET_INPUT($app_control->{app}, $sock , sub {
            my ($s , $this , $evt) = @_ ;
            $self->_client_handle_command(_readMsg($s));
    }) ;
}

sub _start_server {
    my ($self, $app_control) = @_;
    my ($rsa_pub, $rsa_priv) = $self->_generate_key();
    $self->{key} = $rsa_priv;
    $self->{public_key_string} = $rsa_pub->serialize();
    ddx $self->{public_key_string};
    $app_control->{sec_code} = md5_base64($self->{public_key_string});
    my $sock = Wx::SocketServer->new('0.0.0.0',SERVICE_PORT,wxSOCKET_WAITALL);
    EVT_SOCKET_CONNECTION($app_control->{app}, $sock , sub {
        my ( $soc , $this , $evt ) = @_ ;
        my $client = $soc->Accept(0) ;
        EVT_SOCKET_INPUT($app_control->{app}, $client , sub {
                my ($s , $this , $evt) = @_ ;
                my $response = $self->_server_handle_command($client, _readMsg($s));
                ddx $response;
                $s->WriteMsg($response . "\n");
        });
    });
}

sub _publish_server_async {
    my ($self, $app_control) = @_;
    threads->create(sub {
        my $publisher = Net::Rendezvous::Publish->new
        or die "couldn't make a Responder object";
        my $service = $publisher->publish(
            name => 'STVBallot',
            type => '_stvballot._tcp',
            port => SERVICE_PORT,
            txt => encode_utf8($app_control->{user_name}) . "\x01" . $app_control->{sec_code},
            );
    })->detach();
}

sub _discover_servers {
    my ($self) = @_;
    my $res = Net::Bonjour->new("stvballot");
    $res->discover;
    return $res->entries;
}

sub _generate_key {
    my ($self) = @_;
    return new Crypt::RSA()->keygen(Size => 1024);
}

sub _client_handle_command {
    my ($self, $command) = @_;
    ddx $command;
}

sub _server_handle_command {
    my ($self, $client, $command) = @_;
    ddx $command;
    my $cname = $self->{client_names}->{$client};
    if (defined $cname) {
        my $cinfo = $self->{clients}->{$cname};
        die unless $cinfo;
        if ($cinfo->{crypt})  {
            my $cmd_str = $cinfo->{crypt}->decrypt($command);
            my $cmd = decode_json($cmd_str);
            return ({
            }->{$cmd->{command}} // sub {"Unknown command: $cmd->{command}"})->();
        }
        else {
            my $cmd = decode_json($command);
            $cmd->{command} eq 'set_enc_key' or return "Unexpected command: $cmd->{command}";
            my $enc_key = $self->{key}->decrypt($cmd->{enc_key});
            $cinfo->{crypt} = Crypt::CBC->new(-key => $cmd->{enc_key}, -cipher => 'Blowfish');
            return 'OK';
        }
    }
    else {
        my $msg = decode_json($command);
        return ({
            get_public_key => sub {
                $cname = $msg->{cname};
                if ($self->{clients}->{$cname})  {
                    return encode_json({Error => lh->maketext("Error: [_1] is already connected", $cname)});
                }
                else {
                    ddx $cname;
                    $self->{clients}->{$cname} = {client => $client};
                    ddx "cname";
                    $self->{client_names}->{$client} = $cname;
                    return $self->{public_key_string};
                }
            },
            reconnect => sub {
                die "TODO";
            },
        }->{$msg->{command}} // sub {"Unknown command: $msg->{command}"})->();
    }
}

sub _readMsg {
    my ($sock) = @_;
    my $buffer;
    $sock->ReadMsg($buffer, 1024 * 1024 * 1024);
    return $buffer;
}

1;
