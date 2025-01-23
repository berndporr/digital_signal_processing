all:
	pdflatex digital_signal_processing
	bibtex digital_signal_processing
	pdflatex digital_signal_processing
	pdflatex digital_signal_processing
	rm -rf docs
	chirun -o docs .
	git add docs
