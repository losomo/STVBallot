package STVBallot::BallotFrame;
use Modern::Perl;
use base qw(Wx::Frame);
use Wx qw(:id :splitterwindow);
use Wx::Event qw(EVT_SIZE);
use STVBallot::ClientsOverview;
use STVBallot::MainNotebook;
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);
    if ($app_state->{app_mode} eq 'server') {
        my $splitter = Wx::SplitterWindow->new($this);
        $splitter->SetMinimumPaneSize(20);
        my $left  = STVBallot::ClientsOverview->new($app_state, $splitter);
        my $right = STVBallot::MainNotebook->new($app_state, $splitter);
        $splitter->SplitVertically($left, $right);
		$splitter->SetSashPosition(150);
    }
    else {
        STVBallot::MainNotebook->new($app_state, $this);
    }
    return $this;
}

1;
