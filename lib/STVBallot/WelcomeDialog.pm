package STVBallot::WelcomeDialog;
use Modern::Perl;
use base qw(Wx::Dialog);
use Data::Dump;
use STVBallot::BallotApp qw(lh);

use Wx::Event qw(EVT_BUTTON EVT_CLOSE);
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
    my $h = 5;
    for my $spec (        
        [server => 'Host ballots'],
        [client => 'Join the committee'],
        [standalone => 'Standalone mode'],
        ) {
        my $button = Wx::Button->new(
            $this,                  # parent
             -1,                    # id
             lh()->maketext($spec->[1]),   # label
             [20, 20 * $h++],         # position [x,y]
             [$form_width-45, 30]   # size [w, h]
        );
        EVT_BUTTON(
            $this,
            $button,
            sub {$this->{app_mode} = $spec->[0]}
        );
    }


    EVT_CLOSE(
        $this,
        \&OnClose
    );

    $this;
}

sub OnClose {
    my($this, $event) = @_;
    $this->Destroy();
}

1;
