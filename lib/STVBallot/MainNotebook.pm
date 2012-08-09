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
    my ($app_control) = shift;
    my ($this) = $class->SUPER::new(@_);
    $this->SetMinSize([500, 300]);
    my $notebook = Wx::Notebook->new($this);
    my $status_bar = Wx::StaticText->new($this, -1, 'Initial status');
    my $sizer = Wx::BoxSizer->new(wxVERTICAL);
    $sizer->Add($notebook, 1, wxEXPAND);
    $sizer->Add($status_bar);
    $app_control->{status_bar} = $status_bar;
    $this->SetSizer($sizer);

    if ($app_control->{app_mode} ne 'client') {        
        my $start_vote_panel = STVBallot::StartVotePanel->new($app_control, $notebook);
        my $vote_state_panel = STVBallot::VoteStatePanel->new($app_control, $notebook);
		$notebook->AddPage($start_vote_panel, lh->maketext('Start Vote'));
		$notebook->AddPage($vote_state_panel, lh->maketext('Vote State'));
	}
    if ($app_control->{app_mode} ne 'server') {
        my $type_panel = STVBallot::TypePanel->new($app_control, $notebook);
        $notebook->AddPage($type_panel, lh->maketext('Ballot Typing'));
    }
    $notebook->ChangeSelection(0);
    return $this;
}

1;
