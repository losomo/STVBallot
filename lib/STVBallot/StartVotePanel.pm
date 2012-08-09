package STVBallot::StartVotePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxHORIZONTAL);
use Wx::Event qw(EVT_SIZE);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);

    my $main_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    my $left_panel = Wx::Panel->new($this);    
    my $left_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $left_panel->SetSizer($left_sizer);
    my $form_grid = Wx::Panel->new($this);
    my $form_sizer = Wx::FlexGridSizer->new(0, 2);
    $form_panel->SetSizer($form_sizer);


    my $right_panel = Wx::Panel->new($this);
    my $right_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $right_panel->SetSizer($right_sizer);


    $this->SetSizer($main_sizer);
    return $this;
}

1;

