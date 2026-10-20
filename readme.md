# TrajecStories: Authoring Stories with First-Person Motion Videos


We introduce TrajecStories, a novel trajectory-based visualization technique for authoring spatial summaries
from first-person motion videos. Such videos are increasingly available for outdoor activities (e.g., biking
to
work) and capture rich information about one’s surroundings (e.g., path, obstacles) and conditions (e.g.,
weather). However, effectively communicating the wealth of information embedded in these videos, as well as
trajectory data (e.g., speed), biometric (e.g., heart rate), and subjective information (e.g., exhaustion),
remains a challenge at the intersection of video processing and data visualization. TrajecStories enables
the
communication of such data with textured trajectories as the main visual encoding, along with incremental
data
binding to include additional data based on their importance in a coherent story-oriented way. We
implemented an
interactive design probe to explore the underlying design space and showcase how TrajecStories can be
leveraged
to yield spatial summaries for various application domains. We also report on early user feedback on the
expressivity of TrajecStories with personal data collections. Finally, we discuss the research agenda and
the
technical challenges to better include this technique in the current visualization pipeline and design
processes.

## Live Demo

An interactive live version is available at: 
https://anonymous.4open.science/w/TrajecStories/demo.html

## How to install Locally

Clone this repo  and launch a local http server.


```
python -m http.server
```

Then the design probe should be accessible at: http://localhost:8000.