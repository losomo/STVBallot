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
    my $app_state = {app_mode => $dialog->get_mode()};
    exit 1 unless $app_state->{app_mode};
    my $title = lh->maketext("STV Ballot") . ' – ' . lh->maketext({
        server => 'Chairman',
        client => 'Committee member',
        standalone => 'Standalone',
        }->{$app_state->{app_mode}});
    my($frame) = STVBallot::BallotFrame->new($app_state, undef, -1, $title, [-1, -1]);
    $frame->Show(1);
    $this->SetTopWindow($frame);
    return 1;
}

1;
