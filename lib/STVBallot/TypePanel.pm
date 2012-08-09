package STVBallot::TypePanel;
use Modern::Perl;
use base qw(Wx::Panel);
use Wx qw(:id wxVERTICAL);
use Wx::Event qw(EVT_SIZE);
use STVBallot::BallotApp qw(lh);
use Data::Dump;

sub new {
    my ($class) = shift;
    my ($app_state) = shift;
    my ($this) = $class->SUPER::new(@_);

    return $this;
}

1;

