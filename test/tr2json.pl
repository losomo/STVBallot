use strict; use warnings;
use JSON;

my $pref = shift @ARGV or die;

open my $jsonf, '<', "$pref.json" or die $!;

my $jsont = "";
while (<$jsonf>) {
    $jsont .= $_;
}
my $config = decode_json($jsont);
my $names = [];
for (my $i = 0; $i < @{$config->{candidates}}; $i++) {
    push @$names, [$i+1, $config->{candidates}->[$i]];
}
close $jsonf;

open my $trf, '<', "$pref.tr" or die $!;

my $ret = {nodes => [], links => []};
my $scores = {};
my $cnum = 0;
my $next_col = 0;
my $links = {};
my $special = {};
while(<$trf>) {
    chomp;
    if (!$cnum && !/^original:/) {
        $cnum++;
        push @{$ret->{nodes}}, map {{name => $_->[1]}} @$names;
    }
    my @F = split /:/;
    if (/^original:/) {
        $scores->{$F[2]} = $F[1];
    }
    elsif (/^removed:/) {
        $next_col = 1;
        $special->{$F[1]} = "grey";
    }
    elsif (/^elected:/) {
        $next_col = 1;
        $special->{$F[1]} = "green";
    }
    elsif(/^transferred/) {
        $scores->{$F[3]} += $F[1];
        $scores->{$F[2]} -= $F[1];
        $links->{$F[3]}->{$F[2]} += $F[1];
    }
    if ($next_col) {
        push @{$ret->{nodes}}, map {{name => $_->[1], special => $special->{$_->[0]} // "magenta"}} @$names;
        push @{$ret->{links}}, map {{source => ($cnum - 1) * @$names + $_->[0] - 1, target => $cnum * @$names + $_->[0] - 1, value => 0 + get_val($_, $scores, $links)}} @$names;
        for my $target (keys %$links) {
            my $hr = $links->{$target};
            for my $source (keys %$hr) {
                push @{$ret->{links}}, {source => ($cnum - 1) * @$names + $source - 1, target => $cnum * @$names + $target - 1, value => 0 + $hr->{$source}};
            }
        }
        $cnum++;
        $links = {};
        $special = {};
        $next_col = 0;
    }
}
print encode_json($ret);

sub get_val {
    my ($name, $scores, $links) = @_;
    my $target = $name->[0];
    my $val = $scores->{$target};
    for my $source (keys %{$links->{$target}}) {
        $val -= $links->{$target}->{$source};
    }
    return $val;
}
