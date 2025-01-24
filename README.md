# Digital Signal Processing

![alt tag](iir_fir_stop.png)

These are the lecture notes which are part of my Digital Signal
Processing (DSP) class which consists of YouTube clips and 3 extensive
assignments = flipped classroom.

[PDF](docs/digital_signal_proce.pdf)

[Online version](https://berndporr.github.io/digital_signal_processing/)

The coding language is Python.

## YouTube clips

The [YouTube Clips](https://www.youtube.com/user/DSPcourse)
are structured in playlists. Every playlist has a specific topic.

## Labwork

The lab is project based with every project running for 3 weeks:

  * Fourier Transform: Audio manipulation with the Fast Fourier Transform (FFT)
  * Finite Impulse Response filters (FIR): ECG 50Hz / DC removal, matched filters & heartbeat / rate detection and LMS filters
  * Infinite Impulse Response filters (IIR): Realtime filtering and plotting of data coming from an ADC

## Prerequisites to compile this LaTeX doc

  - Full LaTeX install
  - chirun to generate an accessible HTML page: https://github.com/chirun-ncl/chirun

## How to generate the PDF and HTML page

There is a makefile which first runs pdflatex and then chirun which outputs it to the docs
subdir. It also assumes that this lives in a repo as it makes sure the docs subdir is included.

Just run
```
make
```
which generates both the local PDF and the web page in docs.

Creative commons BY-SA (C), 2018-2025 Bernd Porr <bernd.porr@glasgow.ac.uk>
