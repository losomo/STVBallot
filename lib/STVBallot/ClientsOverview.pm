package STVBallot::ClientsOverview;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL);
use Wx::Event qw(EVT_SIZE);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);

    my $panel_caption = Wx::StaticText->new($this, -1, lh->maketext('Committee'));
    my $members_panel = Wx::VScrolledWindow->new($this);
    my $main_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $main_sizer->Add($panel_caption);
    $main_sizer->Add($members_panel);
    $this->SetSizer($main_sizer);

    my $members_sizer = Wx::FlexGridSizer->new(0, 3);
    $members_panel->SetSizer($members_sizer);

    return $this;
}

1;
