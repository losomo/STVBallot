#!/usr/bin/perl
use strict; use warnings;
use JSON;
use Data::Dump;
use Encode;
use List::Util qw(max);

my $pref = shift @ARGV or die;

open my $jsonf, '<', $pref or die $!;

my $jsont = "";
while (<$jsonf>) {
    $jsont .= $_;
}
my $config = decode_json($jsont);
my $ballots = $config->{ballots_ab};
close $jsonf;

my $lengths = {}; # length -> count

for my $ballot (keys %$ballots) {
    next if $ballot =~ /^_/;
    my $score = $ballots->{$ballot};
    my @b = split /:/, $ballot;
    $lengths->{max @b} += $score;
}

for my $l (sort {$a <=> $b} keys %$lengths) {
    printf "%d,%d\n", $l, $lengths->{$l};
}
