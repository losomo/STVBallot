package STVBallot::ClientConnectDialog;
use Modern::Perl;
use base qw(Wx::Dialog);
use Data::Dump;
use STVBallot::BallotApp qw(lh);

use Wx::Event qw(EVT_CLOSE);
use Wx qw(:sizer);

sub new {
    my $class = shift;    
    my $parent = shift;
    my $this = $class->SUPER::new($parent, -1, lh->maketext("Connecting"));
    EVT_CLOSE(
        $this,
        \&OnClose
    );
    $this;
}

sub OnClose {
    my($this, $event) = @_;
    $this->EndModal(0);
    $this->Destroy();    
}
1;
