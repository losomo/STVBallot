package STVBallot::TypePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxHORIZONTAL wxEXPAND);
use Wx::Event qw(EVT_SIZE EVT_BUTTON);
use Wx::Grid;
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_control) = shift;
    my ($this) = $class->SUPER::new(@_);
    $this->Disable();
    $app_control->listen('vote_started', sub {$this->Enable(1);});
    my $main_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $this->SetSizer($main_sizer);

    my $top_row = Wx::Panel->new($this);
    my $top_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    $top_row->SetSizer($top_sizer);
    my $subset_select = Wx::Choice->new($top_row);
    $top_sizer->Add($subset_select);
    my $delete_button = Wx::Button->new($top_row, -1,lh->maketext('Delete All'));
    EVT_BUTTON($delete_button, -1, sub {
        #TODO
    });
    $top_sizer->Add($delete_button);
    $main_sizer->Add($top_row);

    # ********************** TABLE ******************

    my $table_scrollpane = Wx::ScrolledWindow->new($this);
    my $table_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $table_scrollpane->SetSizer($table_sizer);
    $table_scrollpane->SetScrollRate(20, 20);
    my $typing_grid = Wx::Grid->new($table_scrollpane);
    $typing_grid->CreateGrid(3,1);
    $table_sizer->Add($typing_grid, 1, wxEXPAND);
    $main_sizer->Add($table_scrollpane, 1, wxEXPAND);

    # *********************** END TABLE **************

    
    my $bottom_row = Wx::Panel->new($this);
    my $bottom_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    $bottom_row->SetSizer($bottom_sizer);
    my $done_button = Wx::Button->new($bottom_row, -1, lh->maketext('Done'));
    EVT_BUTTON($done_button, -1, sub {
        #TODO
    });
    $bottom_sizer->Add($done_button);
    my $export_button = Wx::Button->new($bottom_row, -1,lh->maketext('Print Report'));
    EVT_BUTTON($export_button, -1, sub {
        #TODO
    });
    $bottom_sizer->Add($export_button);
    $main_sizer->Add($bottom_row);

    return $this;
}

1;

