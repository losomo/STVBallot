#!/usr/bin/perl 
package STVBallot::ConnectionManager;
use Modern::Perl;
use Data::Dump;
use STVBallot::BallotApp qw(lh);
use Wx::Event qw(EVT_COMMAND);
use JSON; 
use Net::Rendezvous::Publish;
use Net::Bonjour;
use IO::Socket::SSL;
use Encode;

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
        my $response = from_json($command->GetData());
        $cb->($response);
    });
    threads->create(sub {
        my $result : shared;
        my @servers = map {
            address => $_->address,
            name => decode_utf8(($_->all_attrs)[0]),
            sec_code => ($_->all_attrs)[2]
        }, $self->_discover_servers();
        $result = to_json([@servers]);
        my $threvent = new Wx::PlThreadEvent( -1, $DONE_EVENT, $result);
        Wx::PostEvent($widget, $threvent);
    })->detach();    
}

sub join_session {
    my ($self, $session) = @_;
    #TODO
    ddx $session;
}

sub _start_server {
    my ($self, $app_control) = @_;
    # TODO
    $app_control->{sec_code} = 'ODINID';
    threads->create(sub {
        my ($s, $sock);
        if(!($sock = IO::Socket::SSL->new( Listen => 5,
                           LocalAddr => 'localhost',
                           LocalPort => SERVICE_PORT,
                           Proto     => 'tcp',
                           Reuse     => 1,
                           SSL_verify_mode => 0x01,
                         )) ) {
            die "unable to create socket: ", &IO::Socket::SSL::errstr, "\n";
        }
        while (1) {
          while(($s = $sock->accept())) {
              my ($peer_cert, $subject_name, $issuer_name, $date, $str);
              if( ! $s ) {
                  warn "error: ", $sock->errstr, "\n";
                  next;
              }
              warn "connection opened ($s).\n";
              if(ref($sock) eq "IO::Socket::SSL") {
                  $subject_name = $s->peer_certificate("subject");
                  $issuer_name = $s->peer_certificate("issuer");
              }
              warn "\t subject: '$subject_name'.\n";
              warn "\t issuer: '$issuer_name'.\n";
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

1;
