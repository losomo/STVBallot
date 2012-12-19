use strict; use warnings;
use JSON;

my $pref = shift @ARGV or die;

open my $jsonf, '<', "v3s1.json" or die $!;

my $jsont = "";
while (<$jsonf>) {
    $jsont .= $_;
}
my $config = decode_json($jsont);
my $names = $config->{candidates};
close $jsonf;

open my $trf, '<', "$pref.tr" or die $!;

my $ret = {nodes => [], links => []};
my $graph = {}; # $graph->{$col}->{$candidate} = {special => '', name => '', order => 0, transfers => {$candidate => 0}}
my $inactive = {}; # $inactive->{$candidate} = 0;
my $scores = {};
my $cnum = 0;
my $next_col = 0;
my $links = {};
my $special = {};
while(<$trf>) {
    chomp;
    if (!$cnum && !/^original:/) {
        $inactive->{$_} = 1 for grep !$scores->{$_}, @$names;
        $cnum++;
    }
    my @F = split /:/;
    if (/^original:/) {
        $scores->{$names->[$F[2]-1]} = $F[1];
    }
    elsif (/^removed:/) {
        $next_col = 1;
        $special->{$names->[$F[1]-1]} = "yellow";
    }
    elsif (/^elected:/) {
        $next_col = 1;
        $special->{$names->[$F[1]-1]} = "red";
    }
    elsif(/^transferred/) {
        $scores->{$names->[$F[3]-1]} += $F[1];
        $scores->{$names->[$F[2]-1]} -= $F[1];
        $links->{$names->[$F[3]-1]}->{$names->[$F[2]-1]} += $F[1];
    }
    if ($next_col) {
        $graph->{$cnum} = {};
        $graph->{$cnum}->{$_} = {special => $special->{$_} // "", transfers => {$_ => get_remainder($_, $scores, $links)}} for grep !$inactive->{$_}, @$names;
        $inactive->{$_} = 1 for grep $special->{$_}, @$names;
        delete $graph->{$cnum}->{$_}->{transfers}->{$_} for grep $special->{$_}, @$names;
        for my $target (keys %$links) {
            my $hr = $links->{$target};
            for my $source (keys %$hr) {
                $graph->{$cnum}->{$source}->{transfers}->{$target} = 0 + $hr->{$source};
            }
        }
        $cnum++;
        $links = {};
        $special = {};
        $next_col = 0;
    }
}

my $i = 0;
for my $col (sort {$a <=> $b} keys %$graph) {
    for (@$names) {
        if ($graph->{$col}->{$_}) {
            $graph->{$col}->{$_}->{i} = $i++;
        }
    }
}

for my $col (sort {$a <=> $b} keys %$graph) {
    for my $name (@$names) {
        my $rec = $graph->{$col}->{$name};
        if ($rec) {
            push @{$ret->{nodes}}, {name => $name, special => $rec->{special}};
            for my $target_name (keys %{$rec->{transfers}}) {
                push @{$ret->{links}}, {
                    source => $rec->{i},
                    target => $graph->{$col + 1}->{$target_name}->{i},
                    value => $rec->{transfers}->{$target_name},
                };
            }
        }
    }
}

print encode_json($ret);

sub get_remainder {
    my ($name, $scores, $links) = @_;
    my $target = $name;
    my $val = $scores->{$target};
    for my $source (keys %{$links->{$target}}) {
        $val -= $links->{$target}->{$source};
    }
    return $val;
}
