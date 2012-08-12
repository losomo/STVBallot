package STVBallot::ClientConnectDialog;
use Modern::Perl;
use base qw(Wx::Dialog);
use Data::Dump;
use STVBallot::BallotApp qw(lh);

use Wx::Event qw(EVT_CLOSE EVT_BUTTON EVT_TIMER);
use Wx qw(:sizer wxVERTICAL wxEXPAND);

sub new {
    my ($class, $parent, $app_control) = @_;
    my $this = $class->SUPER::new($parent, -1, lh->maketext("Connecting"));
    $this->EnableCloseButton(0);
    EVT_CLOSE( $this, \&OnClose);
    my $main_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $this->SetSizer($main_sizer);
    $main_sizer->Add(Wx::StaticText->new($this, -1, lh->maketext('Available sessions')));
    my $status_text = Wx::StaticText->new($this, -1, '');
    $main_sizer->Add($status_text);
    my $sessions_scrollpane = Wx::ScrolledWindow->new($this);
    my $scroll_sizer = Wx::BoxSizer->new(wxVERTICAL);
    $sessions_scrollpane->SetSizer($scroll_sizer);
    $sessions_scrollpane->SetScrollRate(20, 20);
    my $session_list = Wx::Panel->new($sessions_scrollpane);
    $scroll_sizer->Add($session_list, 1, wxEXPAND);
    $session_list->SetMinSize([200,100]);
    my $session_sizer = Wx::FlexGridSizer->new(0, 3);
    my $refresh_sub;
    $refresh_sub = sub {
        if ($this->{destroy})  {
                $this->Destroy();
                return;
        }
        $status_text->SetLabel(lh->maketext('Searching...'));
        $app_control->{connection_manager}->find_servers_async($parent, sub {
            my ($found) = @_;
            if ($this->{destroy})  {
                    $this->Destroy();
                    return;
            }
            $status_text->SetLabel(lh->maketext('Found [*,_1, session,sessions,no sessions]', scalar(@$found)));
            for ($session_list->GetChildren()) {
                $session_sizer->Remove($_);
                $_->Destroy();
            }
            for my $session (@$found) {
                $session_sizer->Add(Wx::StaticText->new($session_list, -1, $session->{name}));
                $session_sizer->Add(Wx::StaticText->new($session_list, -1, $session->{sec_code}));
                my $connect_button = Wx::Button->new($session_list, -1,lh->maketext('Join'));
                EVT_BUTTON($connect_button, -1, sub {
                    $app_control->{connection_manager}->join_session($session);
                    $this->Close();
                    $this->{destroy} = 1;
                });
                $session_sizer->Add($connect_button);
                $session_sizer->Layout();
                $session_list->Layout();
            }
            my $timer = Wx::Timer->new($parent);
            $timer->Start(10_000, 1);
            EVT_TIMER($parent, -1, $refresh_sub);
        });
    };
    $refresh_sub->();
    $session_list->SetSizer($session_sizer);
    $main_sizer->Add($sessions_scrollpane, 1, wxEXPAND);

    my $quit_button = Wx::Button->new($this, -1,lh->maketext('Quit'));
    EVT_BUTTON($quit_button, -1, sub {
        $this->EndModal(1);
    });
    $main_sizer->Add($quit_button);
    $this;
}

sub OnClose {
    my($this, $event) = @_;
    $this->EndModal(0);
}
1;
