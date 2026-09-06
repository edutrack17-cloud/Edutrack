package com.edutrack.dashboard.util;

import com.edutrack.dashboard.enums.DashboardPeriod;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;

public class DashboardDateRangeResolver {

    public record DateRange(LocalDate start, LocalDate end) {}

    public static DateRange resolve(DashboardPeriod period, LocalDate anchorDate) {
        LocalDate date = anchorDate != null ? anchorDate : LocalDate.now();

        return switch (period) {
            case daily -> new DateRange(date, date);
            case weekly -> new DateRange(
                    date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)),
                    date.with(TemporalAdjusters.nextOrSame(DayOfWeek.FRIDAY))
            );
            case monthly -> new DateRange(
                    date.with(TemporalAdjusters.firstDayOfMonth()),
                    date.with(TemporalAdjusters.lastDayOfMonth())
            );
            case yearly -> new DateRange(
                    date.with(TemporalAdjusters.firstDayOfYear()),
                    date.with(TemporalAdjusters.lastDayOfYear())
            );
        };
    }

    // Splits a range into the chart buckets described in the spec:
    // daily -> 1 bucket, weekly -> a day each, monthly -> a week each, yearly -> a month each
    public static List<LocalDate[]> splitIntoBuckets(DashboardPeriod period, DateRange range) {
        List<LocalDate[]> buckets = new ArrayList<>();

        switch (period) {
            case daily -> buckets.add(new LocalDate[]{range.start(), range.end()});
            case weekly -> {
                LocalDate day = range.start();
                while (!day.isAfter(range.end())) {
                    buckets.add(new LocalDate[]{day, day});
                    day = day.plusDays(1);
                }
            }
            case monthly -> {
                LocalDate weekStart = range.start();
                while (!weekStart.isAfter(range.end())) {
                    LocalDate weekEnd = weekStart.plusDays(6);
                    if (weekEnd.isAfter(range.end())) weekEnd = range.end();
                    buckets.add(new LocalDate[]{weekStart, weekEnd});
                    weekStart = weekEnd.plusDays(1);
                }
            }
            case yearly -> {
                for (int month = 1; month <= 12; month++) {
                    LocalDate monthStart = LocalDate.of(range.start().getYear(), month, 1);
                    buckets.add(new LocalDate[]{monthStart, monthStart.with(TemporalAdjusters.lastDayOfMonth())});
                }
            }
        }
        return buckets;
    }
}