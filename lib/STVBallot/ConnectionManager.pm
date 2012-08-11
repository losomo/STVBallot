#!/usr/bin/perl 
package STVBallot::ConnectionManager;
use Modern::Perl;
use Data::Dump;
use STVBallot::BallotApp qw(lh);
use Wx::Event qw(EVT_COMMAND);
use JSON; 

my $DONE_EVENT : shared = Wx::NewEventType;
my $s = 665;

sub new {
    my $class = shift;
    my $app_mode = shift;
    my $self = {app_mode => $app_mode};
    bless $self, $class;
    return $self;
}

sub find_servers_async {
    my ($self, $widget, $cb) = @_; @_ = ();
    EVT_COMMAND($widget, -1, $DONE_EVENT, sub {
        my ($widget, $command) = @_;
        my $response = from_json($command->GetData());
        $cb->($response);
    });
    $s++;
    threads->create(sub {
        my $result : shared;
        sleep 3;
        $result = to_json({name => 'Jachym Predseda', sec_code => $s, port => 8});
        my $threvent = new Wx::PlThreadEvent( -1, $DONE_EVENT, $result);
        Wx::PostEvent($widget, $threvent);
    })->detach();    
}

sub join_session {
    my ($self, $session) = @_;
}
1;
