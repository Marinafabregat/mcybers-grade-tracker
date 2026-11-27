# Master's Grades

## Starting from WSL

Go to the `mcybers-grade-tracker` folder and run:

```bash
bash init.sh
```

Open [http://localhost:8765](http://localhost:8765) in your Windows browser. To stop the app, press Ctrl+C. It requires Python 3.9 or later and does not use any external packages. If the port is already in use, run `bash init.sh --port 8766` and open [http://localhost:8766](http://localhost:8766).

If you prefer Docker, run `docker compose up --build` from the same folder and open [http://localhost:8765](http://localhost:8765). The Compose configuration publishes the app on localhost only. Docker Compose and an internet connection are required to download the Python image the first time. Do not change the port binding to expose the app to an untrusted network; it has no authentication and uses HTTP.

## Recording grades and trying out targets

- Save each course's grades using **Save grades**. Both commas and periods are accepted as decimal separators. An empty field is treated as pending, while zero counts as a grade.
- The final grade range uses 0 and 10 as the lower and upper bounds for pending grades. The average for graded work is calculated using the weight that has already been graded.
- The default targets are 5, 7, and 9. You can also set a custom target for each course. If multiple items are pending, you can calculate the weighted average required or choose one item and assume a grade for the rest. The simulation assumptions reset when you reload the app.
- Calculated minimum grades are rounded up to two decimal places. The app uses the weighted grade before any official rounding.
- For AS, you can enter the overall project grade or break it down into content, presentation, and knowledge/questions. For CSMAGT, you can enter the average report grade or specify the number of reports and enter each grade individually. For BLOCKCHAIN, you can enter the overall midterm grade or break it down into the test exam and short exam. All modes retain the values you enter, but only fields from the active mode count toward the grade.
- For CSMAGT, enter the attendance grade and actual attendance percentage separately. The course guide requires at least 80% attendance and assigns 10% of the grade to attendance. It does not specify how to convert the actual attendance percentage into a grade or what grade applies if the requirement is not met.

## Data

Both methods save grades in `data/notas.sqlite3`, alongside this file. To back up the data or move it to another computer, close the app and copy the `data` folder.

## Course guides

| Course | Assessment |
|---|---|
| AS | Two tests, 20% each. Project 30% and SecDevOps lab 30%. The project is weighted as follows: content 40%, presentation 30%, and knowledge/questions 30%. |
| CSMAGT | Reports of equal weight, worth 60% in total. Peer assessment 20%, attendance 10%, and debates/participation 10%. Minimum attendance: 80%. |
| DPROT | Final exam 40%; lab assignments and reports 60%. |
| MALW | Exam 30%, lab 20% (can be broken down into four individual lab grades), project 30%, and presentations 20%. |
| NS | Midterm 30%, final exam 40%, attendance and in-class performance 10%, and assignments 20%. |
| TMA | Midterm 20%, final exam 30%, lab/project 40%, and participation 10%. |
| BLOCKCHAIN | Midterm 50% (test 30% + short exam 20%), lab 10%, and project 40%. |
