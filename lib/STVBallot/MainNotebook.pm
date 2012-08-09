package STVBallot::MainNotebook;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL);
use Wx::Event qw(EVT_SIZE);
use STVBallot::BallotApp qw(lh);
use STVBallot::StartVotePanel;
use STVBallot::VoteStatePanel;
use STVBallot::TypePanel;
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);
    my $notebook = Wx::Notebook->new($this, -1);
    my $status_bar = Wx::StaticText->new($this, -1, 'Initial status');
    my $sizer = Wx::BoxSizer->new(wxVERTICAL);
    $sizer->Add($notebook);
    $sizer->Add($status_bar);
    $app_state->{status_bar} = $status_bar;
    $this->SetSizer($sizer);

    $notebook->AddPage(STVBallot::StartVotePanel->new($app_state, $this), lh->maketext('Start Vote'));
    $notebook->AddPage(STVBallot::VoteStatePanel->new($app_state, $this), lh->maketext('Vote State'));
    if ($app_state->{app_mode} ne 'server') {
        $notebook->AddPage(STVBallot::TypePanel->new($app_state, $this), lh->maketext('Ballot Typing'));
    }
    $notebook->SetSelection(0);
    return $this;
}

1;
