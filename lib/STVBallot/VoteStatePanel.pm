package STVBallot::VoteStatePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxHORIZONTAL wxEXPAND);
use Wx::Event qw(EVT_SIZE EVT_BUTTON);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);
    $this->Disable();
    my $main_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    $this->SetSizer($main_sizer);

    # ************ Left panel ******************************
    my $left_panel = Wx::Panel->new($this);    
    my $left_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $left_panel->SetSizer($left_sizer);
    
    my $ballots_button = Wx::Button->new($left_panel, -1,lh->maketext('Print ballots'));
    $ballots_button->Disable();
    EVT_BUTTON($ballots_button, -1, sub {
        #TODO
    });
    $left_sizer->Add($ballots_button);

    # ************ Typing progress ***********
    $left_sizer->Add(Wx::StaticText->new($left_panel, -1, lh->maketext('Typing progress') . ':'));
    my $progress_scrollpane = Wx::ScrolledWindow->new($left_panel);
    my $scroll_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $progress_scrollpane->SetSizer($scroll_sizer);
    $progress_scrollpane->SetScrollRate(20, 20);
    my $progress_grid = Wx::Panel->new($progress_scrollpane);
    my $progress_sizer = Wx::FlexGridSizer->new(0, 4);
    $progress_grid->SetSizer($progress_sizer);
    $this->{progress_grid} = $progress_grid;
    $left_sizer->Add($progress_scrollpane, 1, wxEXPAND);

    # ************* Counting report **********
    my $report_scrollpane = Wx::ScrolledWindow->new($left_panel);
    my $report_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $report_scrollpane->SetSizer($report_sizer);
    $report_scrollpane->SetScrollRate(20, 20);
    my $report_widget = Wx::StaticText->new($report_scrollpane, -1, lh->maketext('Counting report'));
    $this->{report_widget} = $report_widget;
    $report_sizer->Add($report_widget, 1, wxEXPAND);
    $left_sizer->Add($report_scrollpane, 1, wxEXPAND);
    
    # ************ Right panel ******************************
    my $right_panel = Wx::Panel->new($this);
    my $right_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $right_panel->SetSizer($right_sizer);
    
    my $openSTV_button = Wx::Button->new($right_panel, -1,lh->maketext('Export to OpenSTV'));
    $openSTV_button->Disable();
    EVT_BUTTON($openSTV_button, -1, sub {
        #TODO
    });
    $right_sizer->Add($openSTV_button);

    my $finnish_button = Wx::Button->new($right_panel, -1,lh->maketext('Compute Results'));
    $finnish_button->Disable();
    EVT_BUTTON($finnish_button, -1, sub {
        #TODO
    });
    $right_sizer->Add($finnish_button);

    my $mandate_scrollpane = Wx::ScrolledWindow->new($right_panel);
    my $mandate_scroll_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $mandate_scrollpane->SetSizer($mandate_scroll_sizer);
    $mandate_scrollpane->SetScrollRate(20, 20);
    my $mandate_table = Wx::Panel->new($mandate_scrollpane, -1);
    my $mandate_sizer = Wx::FlexGridSizer->new(0, 2);
    $mandate_table->SetSizer($mandate_sizer);
    $this->{mandate_table} = $mandate_table;
    $mandate_scroll_sizer->Add($mandate_table, 1, wxEXPAND);
    $right_sizer->Add($mandate_scrollpane, 1, wxEXPAND);

    my $protocol_button = Wx::Button->new($right_panel, -1,lh->maketext('Print Report'));
    EVT_BUTTON($protocol_button, -1, sub {
        #TODO
    });
    $right_sizer->Add($protocol_button);

    $main_sizer->Add($left_panel, 1, wxEXPAND);
    $main_sizer->Add(20, 20);
    $main_sizer->Add($right_panel);
    return $this;
}

sub update_progress {
    my ($p) = @_; # [[name, primary_progress, secondary_progress, state]]
    # TODO
}

1;

