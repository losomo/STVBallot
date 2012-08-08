package STVBallot::WelcomeDialog;
use Modern::Perl;
use base qw(Wx::Dialog);
use Data::Dump;
use STVBallot::BallotApp qw(lh);

use Wx::Event qw(EVT_BUTTON EVT_CLOSE EVT_TEXT);
use Wx qw(:sizer
          wxDefaultPosition
          wxDefaultSize
          wxDefaultValidator
          wxDEFAULT_DIALOG_STYLE
          wxID_OK
          wxOK
          wxRESIZE_BORDER
          wxTE_MULTILINE
          );

use constant ROW => 30;

sub new {
    my $class = shift;

    # Main window
    my $form_width  = 480;
    my $form_height = 175;

    my $this = $class->SUPER::new(
        undef,  # parent
        -1,     # id
        $_[0],  # title
        $_[1],  # position [x, y]
        [$form_width, $form_height] # size [width, height]
    );
    my $h = 1;
    my $name_caption = Wx::StaticText->new(
        $this,             
        -1,                
        lh->maketext('Enter your name'), 
        [20, ROW * $h],           # [x, y] coordinates of the control
    );
    my $name_ctrl = Wx::TextCtrl->new(
            $this, 
            -1,
            '', 
            [20 + 160,ROW * $h++ - 5], 
            [$form_width-205, ROW], 
            0 
    );
    for my $spec (        
        [server =>     'Host ballots',       0],
        [client =>     'Join the committee', 0],
        [standalone => 'Standalone mode',    1],
        ) {
        my $button = Wx::Button->new(
            $this,                  # parent
             -1,                    # id
             lh->maketext($spec->[1]),   # label
             [20, ROW * $h++],         # position [x,y]
             [$form_width-45, 30]   # size [w, h]
        );
        EVT_BUTTON(
            $this,
            $button,
            sub {$this->{app_mode} = $spec->[0]; $this->Close}
        );
        $button->Enable($spec->[2]);
        $this->{buttons} //= [];
        push @{$this->{buttons}}, $button;
    }

    EVT_TEXT($this, $name_ctrl, sub {
        my $enable = length $name_ctrl->GetValue >= 2;
        $this->{buttons}->[$_]->Enable($enable) for (0,1);        
    });
    EVT_CLOSE(
        $this,
        \&OnClose
    );

    $this;
}

sub OnClose {
    my($this, $event) = @_;
    $this->EndModal(0);
    $this->Destroy();    
}

sub get_mode {
    my($this) = @_;
    return $this->{app_mode};
}

1;
