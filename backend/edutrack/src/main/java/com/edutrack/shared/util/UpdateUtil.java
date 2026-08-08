package com.edutrack.shared.util;

import java.util.Objects;
import java.util.function.Consumer;
import java.util.function.Supplier;

public class UpdateUtil {

    public static <T> boolean updateIfChanged(
            Supplier<T> getter,
            Consumer<T> setter,
            T newValue
    ) {
        T currentValue = getter.get();

        if (!Objects.equals(currentValue, newValue)){
            setter.accept(newValue);
            return true;
        }

        return false;
    }

    public static boolean updateStringIfChanged(
            Supplier<String> getter,
            Consumer<String> setter,
            String newValue
    ) {
        if (newValue == null || newValue.isBlank()) {
            return false;
        }

        String currentValue = getter.get();

        if (!Objects.equals(currentValue, newValue)){
            setter.accept(newValue);
            return true;
        }

        return false;
    }

    public static boolean updateStringAllowBlankAsNull(
            Supplier<String> getter,
            Consumer<String> setter,
            String newValue
    ) {
        if (newValue == null) {
            return false;
        }

        String normalizedValue = newValue.isBlank() ? null : newValue;
        String currentValue = getter.get();

        if (!Objects.equals(currentValue, normalizedValue)) {
            setter.accept(normalizedValue);
            return true;
        }

        return false;
    }
}
