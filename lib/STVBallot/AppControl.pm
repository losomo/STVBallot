package STVBallot::AppControl;
use Modern::Perl;
use Data::Dump;

sub new {
    my ($class) = shift;
    my $self = shift;
    bless $self, $class;
    $self->{listeners} //= {};
    return $self;
}

sub listen {
    my ($self, $type, $cb) = @_;
    die "No cb for $type" unless $cb;
    die "No type" unless $type;
    my $l = $self->{listeners};
    $l->{$type} //= [];
    push @{$l->{$type}}, $cb;
}

sub signal {
    my $self = shift;
    my $type = shift;
    for my $cb (@{$self->{listeners}->{$type} // []}) {
        $cb->(@_);
    }
}

1;
