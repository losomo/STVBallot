#!/usr/bin/perl 
package STVBallot::ConnectionManager;
use Modern::Perl;
use Data::Dump;
use STVBallot::BallotApp qw(lh);
use Wx::Event qw(EVT_COMMAND);
use JSON; 
use Net::Rendezvous::Publish;
use Net::Bonjour;
use Encode;
use Crypt::OpenSSL::RSA;
use Crypt::CBC;
use Digest::MD5 qw(md5 md5_hex md5_base64);

use constant SERVICE_PORT => 51432;
my $DONE_EVENT : shared = Wx::NewEventType;

sub new {
    my $class = shift;
    my $app_control = shift;
    my $self = {app_control => $app_control};
    bless $self, $class;
    if ($app_control->{app_mode} eq 'server') {
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
            name => decode_utf8(($_->all_attrs)[2]),
            sec_code => ($_->all_attrs)[0]
        }, $self->_discover_servers();
        $result = encode_json([@servers]);
        my $threvent = new Wx::PlThreadEvent( -1, $DONE_EVENT, $result);
        Wx::PostEvent($widget, $threvent);
    })->detach();    
}

sub join_session {
    my ($self, $session) = @_;
    my $sock = IO::Socket::INET->new(
            PeerAddr => $session->{address},
            PeerPort => SERVICE_PORT,
            Proto    => 'tcp');
    $self->{socket} = $sock;
    $self->{enc_key} = get_random_bytes(256);
    $sock->print(encode_json({command => 'get_public_key'}));
    my $server_key = $sock->getline;
    $server_key = Crypt::OpenSSL::RSA->new_public_key($server_key);
    md5_base64($server_key->get_public_key_string) eq $session->{sec_code} or die "security code mismatch";
    $sock->print(encode_json({command => 'set_enc_key', enc_key => $server_key->encrypt($self->{enc_key})}));
    my $confirmation = $sock->getline;
    $confirmation =~ /OK/ or die "Couldn't set encryption key";
}

sub _start_server {
    my ($self, $app_control) = @_;
    my $rsa = $self->_generate_key();
    $app_control->{key} = $rsa;
    $app_control->{sec_code} = md5_base64($rsa->get_public_key_string);
    threads->create(sub {
        my ($s, $sock);
        if(!($sock = IO::Socket::INET->new( Listen => 5,
                           LocalAddr => 'localhost',
                           LocalPort => SERVICE_PORT,
                           Proto     => 'tcp',
                           Reuse     => 1,
                         )) ) {
            die "unable to create socket: ", &IO::Socket::INET::errstr, "\n";
        }
        while (1) {
          while(($s = $sock->accept())) {
              if( ! $s ) {
                  warn "error: ", $sock->errstr, "\n";
                  next;
              }
              warn "connection opened ($s).\n";
              my $line = <$s>;
              while ($line) {
                  ddx $line;
                  $line = <$s>;
              }
              warn "\t connection closed.\n";
          }
        }
        $sock->close();
        warn "loop exited.\n";
    })->detach();
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
    return Crypt::OpenSSL::RSA->generate_key(1024);
}

1;
