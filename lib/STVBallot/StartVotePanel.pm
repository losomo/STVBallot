package STVBallot::StartVotePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxHORIZONTAL wxTE_RIGHT wxTE_PROCESS_ENTER);
use Wx::Event qw(EVT_KILL_FOCUS EVT_TEXT_ENTER);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);

    my $main_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    $this->SetSizer($main_sizer);
    # ************ Left panel ******************************
    my $left_panel = Wx::Panel->new($this);    
    my $left_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $left_panel->SetSizer($left_sizer);
    # *********** form **************
    my $form_grid = Wx::Panel->new($left_panel);
    my $form_sizer = Wx::FlexGridSizer->new(0, 2);
    $form_grid->SetSizer($form_sizer);
    my $form = [
        ['vote_no_input'         , lh->maketext('Vote number')         ,  1],
        ['candidates_count_input', lh->maketext('Number of candidates'), ''],
        ['mandate_count_input'   , lh->maketext('Number of mandates')  , ''],
        ['ballot_count_input'    , lh->maketext('Number of ballots')   , ''],
    ];
    for my $field (@$form) {
        my $caption = Wx::StaticText->new($form_grid, -1, $field->[1]);
        my $input = Wx::TextCtrl->new($form_grid, -1, $field->[2], [-1,-1], [-1,-1], wxTE_RIGHT|wxTE_PROCESS_ENTER);
        $form_sizer->Add($caption);
        $form_sizer->Add($input);
        $this->{$field->[0]} = $input;
    }
    $left_sizer->Add($form_grid, 0, 0, 2);
    # ************ the rest of the left panel ****
    my $replacement_checkbox = Wx::CheckBox->new($left_panel, -1, lh->maketext('Elect replacement mandates'));
    $left_sizer->Add($replacement_checkbox);
    
    my $shuffle_button = Wx::Button->new($left_panel, -1,lh->maketext('Shuffle candidates'));
    $left_sizer->Add($shuffle_button);

    my $launch_button = Wx::Button->new($left_panel, -1,lh->maketext('Launch ballot'));
    $left_sizer->Add(10, 10);
    $left_sizer->Add($launch_button);
    $main_sizer->Add($left_panel);
    # *********** Right panel *******************************
    my $right_panel = Wx::Panel->new($this);
    my $right_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $right_panel->SetSizer($right_sizer);

    my $candidates_caption = Wx::StaticText->new($right_panel, -1, lh->maketext('Candidates')); 
    $right_sizer->Add($candidates_caption);

    my $candidates_grid = Wx::Panel->new($right_panel);
    my $candidates_sizer = Wx::FlexGridSizer->new(0, 2);
    $candidates_grid->SetSizer($candidates_sizer);
    my $candidates_handler = sub {
        my $no = $this->{candidates_count_input}->GetValue;
        # TODO create or delete controls
    };
    EVT_KILL_FOCUS($this->{candidates_count_input}, $candidates_handler);
    EVT_TEXT_ENTER($this->{candidates_count_input}, -1, $candidates_handler);
    $right_sizer->Add($candidates_grid);
    $main_sizer->Add(20, 20);
    $main_sizer->Add($right_panel);
    return $this;
}

1;

