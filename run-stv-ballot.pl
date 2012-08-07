#!/usr/bin/perl -Ilib
use Modern::Perl;
use STVBallot::BallotApp;

my $app = STVBallot::BallotApp->new();
$app->MainLoop();
