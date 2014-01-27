#!/usr/bin/perl
use strict; use warnings;
use JSON;
use Data::Dump;
use Encode;

my $pref = shift @ARGV or die;
my $limit = shift @ARGV or die;

open my $jsonf, '<', $pref or die $!;

my $jsont = "";
while (<$jsonf>) {
    $jsont .= $_;
}
my $config = decode_json($jsont);
my $names = $config->{candidates};
my $ballots = $config->{ballots_ab};
close $jsonf;

my $scores = {map {($_, 0)} @$names}; # $scores->{$candidate} = 0

for my $ballot (keys %$ballots) {
    next if $ballot =~ /^_/;
    my $score = $ballots->{$ballot};
    my @b = split /:/, $ballot;
    for my $i (0..$#b) {
        $scores->{$names->[$i]} += $score * (1 / $b[$i]) if $b[$i] > 0 && $b[$i] <= $limit;
    }
}

for my $candidate (sort {$scores->{$b} <=> $scores->{$a}} keys %$scores) {
    printf "%d,%s\n", $scores->{$candidate}, encode_utf8($candidate);
}
