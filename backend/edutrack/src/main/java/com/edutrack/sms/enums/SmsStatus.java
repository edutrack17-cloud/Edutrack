package com.edutrack.sms.enums;

public enum SmsStatus {
    PENDING,      // created, not yet handed to TextBee
    QUEUED,       // TextBee accepted (200 OK), device to send soon
    SENT,         // device reported success
    FAILED,       // TextBee error OR device reported failure
    SKIPPED       // no phone number, or status not notifiable
}