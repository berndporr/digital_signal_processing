all:
	pdflatex digital_signal_processing
	bibtex digital_signal_processing
	pdflatex digital_signal_processing
	pdflatex digital_signal_processing
	rm -rf docs
	chirun -o docs .
	touch docs/.nojekyll
	git add docs
	git add docs/.nojekyll
