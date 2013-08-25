%.html : FORCE
	cat header.template > $@
	markdown $(@:.html=).md >> $@
	cat footer.template >> $@

.PHONY: all

all: $(patsubst %.md,%.html,$(wildcard *.md))

.PHONY: clean
clean:
	- rm *.html
FORCE:

.PHONY: install
install: all
	mkdir -p ../app/doc
	cp -r inc *.html ../app/doc
