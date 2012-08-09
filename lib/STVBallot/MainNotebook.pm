package STVBallot::MainNotebook;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxEXPAND);
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
    my $notebook = Wx::Notebook->new($this);
    my $status_bar = Wx::StaticText->new($this, -1, 'Initial status');
    my $sizer = Wx::BoxSizer->new(wxVERTICAL);
    $sizer->Add($notebook, 1, wxEXPAND);
    $sizer->Add($status_bar);
    $app_state->{status_bar} = $status_bar;
    $this->SetSizer($sizer);

    if ($app_state->{app_mode} ne 'client') {
		$notebook->AddPage(STVBallot::StartVotePanel->new($app_state, $notebook), lh->maketext('Start Vote'));
		$notebook->AddPage(STVBallot::VoteStatePanel->new($app_state, $notebook), lh->maketext('Vote State'));
	}
    if ($app_state->{app_mode} ne 'server') {
        $notebook->AddPage(STVBallot::TypePanel->new($app_state, $notebook), lh->maketext('Ballot Typing'));
    }
    $notebook->SetSelection(0);
    return $this;
}

1;
