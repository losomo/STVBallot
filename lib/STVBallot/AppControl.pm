package STVBallot::AppControl;
use Modern::Perl;
use Data::Dump;

sub new {
    my ($class) = shift;
    my $self = shift;
    bless $self, $class;
    return $self;
}

1;
