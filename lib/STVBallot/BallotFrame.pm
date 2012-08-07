package STVBallot::BallotFrame;
use Modern::Perl;
use base qw(Wx::Frame);
use Wx qw(:id :toolbar wxNullBitmap wxDefaultPosition wxDefaultSize wxDefaultPosition wxDefaultSize wxNullBitmap wxTB_VERTICAL wxSIZE wxTE_MULTILINE wxBITMAP_TYPE_BMP);
use Wx::Event qw(EVT_SIZE EVT_MENU EVT_COMBOBOX EVT_UPDATE_UI EVT_TOOL_ENTER);
use Data::Dump;

sub new {
    my( $class ) = shift;
    my( $app_state ) = shift;
    my( $this ) = $class->SUPER::new(@_);
    ddx $app_state;

    # allocate id numbers for controls.
    # This method appears a little strange, but it's a way to quickly allocate
    # all IDs in one place.

    my( $ID_LeftPanel, $ID_tabPanel ) = ( 1 .. 100 );


    return $this;
}

1;
