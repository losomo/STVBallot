#!/usr/bin/perl
use strict;
use warnings;
use JSON;
use File::Slurp;
use Data::Dump;

my ($confile, $trfile) = @ARGV;
my $transfers = {}; # $transfers->{$source_nodeno}->{$target_nodeno} = $value;
my $nodes = {0 => {}}; # $nodes->{$step0}->{$candidate0} = [$nodeno, $special, $score];
my $lastnode = 0;
my $step = 0;

my $conf = decode_json(read_file($confile));
my $candidates = $conf->{candidates};
my $active = {map {($_ - 1) => 1} (1..@$candidates)};
open my $tr, '<', $trfile or die $!;

while (<$tr>) {
    chomp;
    my @F = split /:/;
    {
        original => sub {
            $step == 0 or die $step;
            $nodes->{$step}->{$F[2] - 1} = [$lastnode++, "", $F[1]];
            $nodes->{$step - 1}->{$F[2] - 1} = [$lastnode++, "", $F[1]];
            $transfers->{$nodes->{$step - 1}->{$F[2] - 1}->[0]} //= {};
            $transfers->{$nodes->{$step - 1}->{$F[2] - 1}->[0]}->{$nodes->{$step}->{$F[2] - 1}->[0]} += $F[1];
        },
        transferred => sub {
            $nodes->{$step + 1} //= {};
            $nodes->{$step + 1}->{$F[3] - 1} //= [$lastnode++, "", $nodes->{$step}->{$F[3] - 1}->[2]];
            $nodes->{$step + 1}->{$F[3] - 1}->[2] += $F[1];
            $transfers->{$nodes->{$step}->{$F[2] - 1}->[0]} //= {};
            $transfers->{$nodes->{$step}->{$F[2] - 1}->[0]}->{$nodes->{$step + 1}->{$F[3] - 1}->[0]} += $F[1];
        },
        elected => sub {
            add_step("red", @F);
        },
        removed => sub {
            add_step("yellow", @F);
        }
    }->{$F[0]}->();
}
#ddx $nodes, $transfers;
my $n = [];
for my $s (sort {$a <=> $b} keys %$nodes) {
    for (sort {$a <=> $b} keys %{$nodes->{$s}}) {
        $n->[$nodes->{$s}->{$_}->[0]] = {
                            special => $nodes->{$s}->{$_}->[1], 
                            name => $candidates->[$_],
        }; 
    }
}
print encode_json({
    nodes => $n,
    links => [map {
                my $s = $_;
                map {
                    {
                        source => $s + 0, 
                        target => $_ + 0, 
                        value => $transfers->{$s}->{$_} + 0,
                    }
                } keys %{$transfers->{$s}}
             } keys %$transfers],
});

sub add_step {
    my ($special, @F) = @_;
    $nodes->{$step}->{$F[1] - 1}->[1] = $special;
    delete $active->{$F[1] - 1};
    $step++;
    for (keys %$active) {
        $nodes->{$step}->{$_} //= [$lastnode++, "", $nodes->{$step - 1}->{$_}->[2]];
        $transfers->{$nodes->{$step - 1}->{$_}->[0]} //= {};
        $transfers->{$nodes->{$step - 1}->{$_}->[0]}->{$nodes->{$step}->{$_}->[0]} += $nodes->{$step - 1}->{$_}->[2];
    }
}
