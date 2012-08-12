package STVBallot::WelcomeDialog;
use Modern::Perl;
use base qw(Wx::Dialog);
use Data::Dump;
use STVBallot::BallotApp qw(lh);

use Wx::Event qw(EVT_BUTTON EVT_CLOSE EVT_TEXT);
use Wx qw(:sizer wxVERTICAL wxHORIZONTAL wxEXPAND wxALL wxALIGN_CENTER);

sub new {
    my $class = shift;
    my $parent = shift;

    my $this = $class->SUPER::new($parent, -1, lh->maketext("STV Ballot"));
    my $main_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $this->SetSizer($main_sizer);

    my $top_row = Wx::Panel->new($this);
    $main_sizer->Add($top_row, 0, wxALL, 15);
    my $top_sizer = Wx::BoxSizer->new(wxHORIZONTAL);
    $top_row->SetSizer($top_sizer);

    $top_sizer->Add(Wx::StaticText->new($top_row, -1, lh->maketext('Enter your name')), 0, wxALIGN_CENTER | wxALL, 5);
    my $name_ctrl = Wx::TextCtrl->new($top_row, -1, '');
    $this->{name_ctrl} = $name_ctrl;
    $name_ctrl->SetMinSize([160,-1]);
    $name_ctrl->SetFocus();
    $top_sizer->Add($name_ctrl, 0, wxALIGN_CENTER | wxALL, 5);
    for my $spec (        
        [server =>     lh->maketext('Host ballots'),       0],
        [client =>     lh->maketext('Join the committee'), 0],
        [standalone => lh->maketext('Standalone mode'),    1],
        ) {
        my $button = Wx::Button->new($this, -1, $spec->[1]);
        $main_sizer->Add($button, 0, wxEXPAND|wxALL, 5);
        EVT_BUTTON($button, -1, sub {$this->{app_mode} = $spec->[0]; $this->Close});
        $button->Enable($spec->[2]);
        $this->{buttons} //= [];
        push @{$this->{buttons}}, $button;
    }

    EVT_TEXT($name_ctrl, -1, sub {
        my $enable = length $name_ctrl->GetValue >= 2;
        $this->{buttons}->[$_]->Enable($enable) for (0,1);        
    });
    EVT_CLOSE(
        $this,
        \&OnClose
    );
    $this->Fit;
    $this;
}

sub OnClose {
    my($this, $event) = @_;
    $this->{name} = $this->{name_ctrl}->GetValue();
    $this->EndModal(0);
    $this->Destroy();    
}

sub get_mode {
    my($this) = @_;
    return $this->{app_mode};
}

sub get_name {
    my($this) = @_;
    return $this->{name};
}

1;
