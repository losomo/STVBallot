#!/usr/bin/perl 
package STVBallot::BallotApp;
use Modern::Perl;
my $_lh = STVBallot::L10N->get_handle("en_us") || die "Language?";
sub lh { $_lh; }
use Exporter::Easy (
    OK => ['lh']
);
use Wx;
use STVBallot::L10N;
use STVBallot::BallotFrame;
use STVBallot::WelcomeDialog;
use base qw(Wx::App);
use Data::Dump;


sub OnInit {
    my($this) = @_;
    my ($dialog) = STVBallot::WelcomeDialog->new(lh->maketext("STV Ballot"), [-1, -1]);
    $dialog->ShowModal();
    my $app_state = {app_mode => STVBallot::WelcomeDialog->get_mode()};
    my($frame) = STVBallot::BallotFrame->new($app_state, undef, -1, lh->maketext("STV Ballot"));
    $frame->Show(1);
    $this->SetTopWindow($frame);
    return 1;
}

1;
