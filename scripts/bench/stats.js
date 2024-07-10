'use strict';

// Importing necessary modules: chalk for colored text in the terminal and cli-table for creating formatted tables
const chalk = require('chalk');
const Table = require('cli-table');

/**
 * Calculates the percentage change between two values and formats the result.
 */
function percentChange(prev, current, prevSem, currentSem) {
  const [mean, sd] = calculateMeanAndSdOfRatioFromDeltaMethod(
    prev,
    current,
    prevSem,
    currentSem
  );
  const pctChange = +(mean * 100).toFixed(1);
  const ci95 = +(100 * 1.96 * sd).toFixed(1);

  const ciInfo = ci95 > 0 ? ` +- ${ci95} %` : '';
  const text = `${pctChange > 0 ? '+' : ''}${pctChange} %${ciInfo}`;
  if (pctChange + ci95 < 0) {
    return chalk.green(text);
  } else if (pctChange - ci95 > 0) {
    return chalk.red(text);
  } else {
    // Statistically insignificant change
    return text;
  }
}

/**
 * Calculates the mean and standard deviation of the ratio from the delta method.
 */
function calculateMeanAndSdOfRatioFromDeltaMethod(
  meanControl,
  meanTest,
  semControl,
  semTest
) {
  const mean =
    (meanTest - meanControl) / meanControl -
    (Math.pow(semControl, 2) * meanTest) / Math.pow(meanControl, 3);
  const variance =
    Math.pow(semTest / meanControl, 2) +
    Math.pow(semControl * meanTest, 2) / Math.pow(meanControl, 4);
  return [mean, Math.sqrt(variance)];
}

/**
 * Adds benchmark results to a table.
 */
function addBenchmarkResults(table, localResults, remoteMasterResults) {
  const benchmarks = Object.keys(
    (localResults && localResults.benchmarks) ||
      (remoteMasterResults && remoteMasterResults.benchmarks)
  );
  benchmarks.forEach(benchmark => {
    const rowHeader = [chalk.white.bold(benchmark)];
    if (remoteMasterResults) {
      rowHeader.push(chalk.white.bold('Time'));
    }
    if (localResults) {
      rowHeader.push(chalk.white.bold('Time'));
    }
    if (localResults && remoteMasterResults) {
      rowHeader.push(chalk.white.bold('Diff'));
    }
    table.push(rowHeader);

    const measurements =
      (localResults && localResults.benchmarks[benchmark].averages) ||
      (remoteMasterResults &&
        remoteMasterResults.benchmarks[benchmark].averages);
    measurements.forEach((measurement, i) => {
      const row = [chalk.gray(measurement.entry)];
      let remoteMean;
      let remoteSem;
      if (remoteMasterResults) {
        remoteMean = remoteMasterResults.benchmarks[benchmark].averages[i].mean;
        remoteSem = remoteMasterResults.benchmarks[benchmark].averages[i].sem;
        // Calculating 95% confidence interval
        const ci95 = remoteSem * 1.96;
        row.push(
          chalk.white(+remoteMean.toFixed(2) + ' ms +- ' + ci95.toFixed(2))
        );
      }
      let localMean;
      let localSem;
      if (localResults) {
        localMean = localResults.benchmarks[benchmark].averages[i].mean;
        localSem = localResults.benchmarks[benchmark].averages[i].sem;
        const ci95 = localSem * 1.96;
        row.push(
          chalk.white(+localMean.toFixed(2) + ' ms +- ' + ci95.toFixed(2))
        );
      }
      if (localResults && remoteMasterResults) {
        row.push(percentChange(remoteMean, localMean, remoteSem, localSem));
      }
      table.push(row);
    });
  });
}

/**
 * Prints the benchmark results by creating and displaying a formatted table.
 */
function printResults(localResults, remoteMasterResults) {
  const head = [''];
  if (remoteMasterResults) {
    head.push(chalk.yellow.bold('Remote (Merge Base)'));
  }
  if (localResults) {
    head.push(chalk.green.bold('Local (Current Branch)'));
  }
  if (localResults && remoteMasterResults) {
    head.push('');
  }
  const table = new Table({head});
  addBenchmarkResults(table, localResults, remoteMasterResults);
  console.log(table.toString());
}

// Exporting the printResults function to be used in other modules
module.exports = printResults;
