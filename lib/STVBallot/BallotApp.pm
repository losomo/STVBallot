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
use STVBallot::ClientConnectDialog;
use STVBallot::AppControl;
use base qw(Wx::App);
use Data::Dump;


sub OnInit {
    my($this) = @_;
    my ($dialog) = STVBallot::WelcomeDialog->new(undef);
    $dialog->ShowModal();
    my $app_control = STVBallot::AppControl->new({app_mode => $dialog->get_mode()});
    exit 1 unless $app_control->{app_mode};
    my $title = lh->maketext("STV Ballot") . ' – ' . lh->maketext({
        server => 'Chairman',
        client => 'Committee member',
        standalone => 'Standalone',
        }->{$app_control->{app_mode}});
    my($frame) = STVBallot::BallotFrame->new($app_control, undef, -1, $title, [-1, -1], [700, 500]);
    $frame->Show(1);
    $this->SetTopWindow($frame);
    if ($app_control->{app_mode} eq 'client') {
        $dialog = STVBallot::ClientConnectDialog->new();
        $dialog->ShowModal();
    }
    return 1;
}

1;
