package com.iot.back.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.iot.back.service.DashboardService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/led")
    public ResponseEntity<Map<String, Boolean>> getLedStatus() {

        return ResponseEntity.ok(
                dashboardService.getLedStatus()
        );
    }

    @PostMapping("/control")
    public ResponseEntity<Map<String, Object>> controlLed(
            @RequestBody Map<String, Object> body) throws Exception {

        return ResponseEntity.ok(
                dashboardService.controlLed(body));
    }
}