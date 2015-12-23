# TopStory

This repository contains the story aggregator component of TopStory.  Once deployed,
it will pull current articles from the New York Times, Guardian, and Alchemy DataNews
every four hours.  Subjects are extracted using the Alchemy Concept Tagging API, 
and subject occurence counts are stored in a dictionary.  The top five most 
frequently occuring subjects across all sources, and across only the New York Times
and Guardian, are stored as top subjects. 

 The application will create a "TopStories" table in the specified 
database and store article titles, URLs, and subjects in the table.  The application
will also create TopSubject and TopSerSubjects tables, and stored the top subjects
for all sources in the former and for the Guardian and New York Times only in 
the latter.  Tables are dropped everytime the article aggregation process is executed
to discard stale results. 

To deploy this application, clone the repository and run npm install; then, run
node app.js.  

