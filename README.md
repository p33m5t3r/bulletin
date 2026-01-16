
todo
[ ] make frontend nice

FRONTEND NOTES:

1. huggingface paper authorships should be truncated past a few names or so; no more than like 3 commas worth of authors!.
2. huggingface papers should be renamed to just trending daily papers
3. huggingface model rankings should link to the model; prepend huggingface.co/<model_id> and that works i think
4. make sure all of the model rankings are sorted by most downloaded!
5. the format of the model rankings should be e.g. `<download count> <download favicon> <model name>` the download count should be formatted readably like "2404 -> 2.4k", or "1,233,213 -> 1.2M"
6. LAYOUT: there should be a lorem ipsum section at the very top; we will include a generated summary of all the papers, lesswrong topics, and trending models at the top! then, below that, we should have two 'columns' (flex row divs) for the top model rankings. below that, another row where the lesswrong entries are on the left and the hfpapers are on the right!



running:

db setup:
1. `./start_mysql.sh` to run the mysql docker container
2. `./setup_mysql.sh` to set up the tables


