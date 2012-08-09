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
    my ($app_control) = shift;
    my ($this) = $class->SUPER::new(@_);
    if ($app_control->{app_mode} eq 'server') {
        my $splitter = Wx::SplitterWindow->new($this);
        $splitter->SetMinimumPaneSize(20);
        my $left  = STVBallot::ClientsOverview->new($app_control, $splitter);
        my $right = STVBallot::MainNotebook->new($app_control, $splitter);
        $splitter->SplitVertically($left, $right);
		$splitter->SetSashPosition(150);
    }
    else {
        STVBallot::MainNotebook->new($app_control, $this);
    }
    return $this;
}

1;
