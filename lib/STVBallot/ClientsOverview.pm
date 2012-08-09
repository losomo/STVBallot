package STVBallot::ClientsOverview;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxEXPAND);
use Wx::Event qw(EVT_SIZE);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);

    my $panel_caption = Wx::StaticText->new($this, -1, lh->maketext('Committee'));
    my $scroll_pane = Wx::ScrolledWindow->new($this);
    $scroll_pane->SetScrollRate(20, 20);
    my $scroll_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $scroll_pane->SetSizer($scroll_sizer);
    my $members_panel = Wx::Panel->new($scroll_pane);
    my $main_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $main_sizer->Add($panel_caption);
    $main_sizer->Add($scroll_pane, 1, wxEXPAND);
    $scroll_sizer->Add($members_panel, 1, wxEXPAND);
    $this->SetSizer($main_sizer);

    my $members_sizer = Wx::FlexGridSizer->new(0, 3);
    $members_panel->SetSizer($members_sizer);

    #for (1..99) {
    #     $members_sizer->Add(Wx::StaticText->new($members_panel, -1, 'Test....'));
    #}

    return $this;
}

1;
