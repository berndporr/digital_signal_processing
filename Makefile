all:
	pdflatex digital_signal_processing
	bibtex digital_signal_processing
	pdflatex digital_signal_processing
	pdflatex digital_signal_processing
	latex2html digital_signal_processing -dir docs -t "Digital Signal Processing" -address "<p><br /><a href=\"https://github.com/berndporr/digital_signal_processing\">github / contact</a><br /></p>"
