stv-ballot: FORCE
	pp -I lib -c -o stv-ballot run-stv-ballot.pl
clean: FORCE
	rm -f stv-ballot
FORCE:
