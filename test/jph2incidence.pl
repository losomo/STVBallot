#!/usr/bin/perl
use strict; use warnings;
use JSON;
use Data::Dump;
use Encode;

my $pref = shift @ARGV or die;
my $positive = shift @ARGV;

open my $jsonf, '<', $pref or die $!;

my $jsont = "";
while (<$jsonf>) {
    $jsont .= $_;
}
my $config = decode_json($jsont);
my $names = $config->{candidates};
my $ballots = $config->{ballots_ab};
close $jsonf;

my $T = [map [map 0, @$names], @$names]; # $T->[$i]->[$j] = 0, $i <= $j

for my $ballot (keys %$ballots) {
    next if $ballot =~ /^_/;
    my $score = $ballots->{$ballot};
    my @b = split /:/, $ballot;
    for my $i (0..$#b) {
        for my $j ($i..$#b) {
            $T->[$i]->[$j] += $score if $positive && $b[$i] > 0 && $b[$j] > 0 || !$positive && !$b[$i] && !$b[$j];
        }
    }
}

for my $i (0..$#$names) {
    print join " ", map $i <= $_ ? $T->[$i]->[$_] : $T->[$_]->[$i],(0..$#$names);
    print "\n";
    printf STDERR "%s,%d\n", encode_utf8($names->[$i]), $T->[$i]->[$i];
}
