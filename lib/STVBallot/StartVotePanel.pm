package STVBallot::StartVotePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL wxHORIZONTAL wxTE_RIGHT wxTE_PROCESS_ENTER wxEXPAND);
use Wx::Event qw(EVT_KILL_FOCUS EVT_TEXT_ENTER EVT_BUTTON);
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
    EVT_BUTTON($shuffle_button, -1, sub {
        my $c = $this->{candidates_controls};
        my $i = @$c;
        while (--$i) {
            my $j = int rand ($i+1);
            my ($orig_i) = [$c->[$i]->[0]->GetValue, $c->[$i]->[1]->GetSelection];
            $c->[$i]->[0]->ChangeValue($c->[$j]->[0]->GetValue);
            $c->[$i]->[1]->SetSelection($c->[$j]->[1]->GetSelection);
            $c->[$j]->[0]->ChangeValue($orig_i->[0]);
            $c->[$j]->[1]->SetSelection($orig_i->[1]);
        }
        $shuffle_button->Disable;
    });
    $left_sizer->Add($shuffle_button);

    my $launch_button = Wx::Button->new($left_panel, -1,lh->maketext('Launch ballot'));
    EVT_BUTTON($launch_button, -1, sub {
       #TODO validate
       $app_state->{vote_state_panel}->Enable(1);
       $app_state->{type_panel}->Enable(1) if $app_state->{type_panel};
       $app_state->{notebook}->ChangeSelection(1);
    });
    $left_sizer->Add(10, 10);
    $left_sizer->Add($launch_button);
    $main_sizer->Add($left_panel);
    # *********** Right panel *******************************
    my $right_panel = Wx::Panel->new($this);
    my $right_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $right_panel->SetSizer($right_sizer);

    my $candidates_caption = Wx::StaticText->new($right_panel, -1, lh->maketext('Candidates') . ':'); 
    $right_sizer->Add($candidates_caption);

    my $candidates_scroll_pane = Wx::ScrolledWindow->new($right_panel);
    my $scroll_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $candidates_scroll_pane->SetSizer($scroll_sizer);
    $candidates_scroll_pane->SetScrollRate(20, 20);
    my $candidates_grid = Wx::Panel->new($candidates_scroll_pane);
    my $candidates_sizer = Wx::FlexGridSizer->new(0, 2);
    $candidates_grid->SetSizer($candidates_sizer);
    my $candidates_handler = sub {
        my $no = $this->{candidates_count_input}->GetValue;
        my $current_no = @{$this->{candidates_controls} // []};
        if ($no > $current_no) {
            for (1..($no-$current_no)) {
                my $candidate_name_input = Wx::TextCtrl->new($candidates_grid, -1, chr 64 + $current_no + $_);
                $candidate_name_input->SetMinSize([200, -1]);
                my $candidate_gender_select = Wx::Choice->new($candidates_grid, -1, [-1,-1], [-1,-1], [
                    '---',
                    lh->maketext('female'),
                    lh->maketext('male'),
                    ]);
                $candidates_sizer->Add($candidate_name_input);
                $candidates_sizer->Add($candidate_gender_select);
                push @{$this->{candidates_controls}}, [$candidate_name_input, $candidate_gender_select];
            }
        }
        elsif ($no < $current_no) {
            for (1..($current_no-$no)) {
                my $controls = pop @{$this->{candidates_controls}};
                $candidates_sizer->Remove($controls->[1]);
                $candidates_sizer->Remove($controls->[0]);
                $controls->[1]->Destroy();
                $controls->[0]->Destroy();
            }
        }
        $this->Layout();
    };
    EVT_KILL_FOCUS($this->{candidates_count_input}, $candidates_handler);
    EVT_TEXT_ENTER($this->{candidates_count_input}, -1, $candidates_handler);
    $scroll_sizer->Add($candidates_grid, 1, wxEXPAND);
    $right_sizer->Add($candidates_scroll_pane, 1, wxEXPAND);
    $main_sizer->Add(20, 20);
    $main_sizer->Add($right_panel, 1, wxEXPAND);

    return $this;
}

1;

