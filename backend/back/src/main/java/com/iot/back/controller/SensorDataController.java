package com.iot.back.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.iot.back.dto.PageResponse;
import com.iot.back.dto.SensorDataResponse;
import com.iot.back.entity.Sensor.SensorType;
import com.iot.back.service.SensorDataService;

@RestController
@RequestMapping("/api/sensor-data")
@CrossOrigin(origins = "*")
public class SensorDataController {

    private final SensorDataService sensorDataService;

    public SensorDataController(
            SensorDataService sensorDataService
    ) {
        this.sensorDataService = sensorDataService;
    }

    @GetMapping
    public ResponseEntity<PageResponse<SensorDataResponse>> getSensorData(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Float value,
            @RequestParam(required = false) String time,
            @RequestParam(required = false) String sort
    ) {
        if (page < 0) {
            page = 0;
        }

        if (size <= 0) {
            size = 10;
        }

        SensorType sensorType = null;

        if (
                type != null
                        && !type.isBlank()
                        && !"all".equalsIgnoreCase(type)
        ) {
            try {
                String mappedType = switch (type.toLowerCase()) {
                    case "temperature" -> "temp";
                    case "humidity" -> "humid";
                    case "light" -> "light";
                    default -> type.toLowerCase();
                };

                sensorType =
                        SensorType.valueOf(mappedType);

            } catch (IllegalArgumentException exception) {
                return ResponseEntity
                        .status(HttpStatus.BAD_REQUEST)
                        .build();
            }
        }

        Sort pageSort = Sort.unsorted();

        if (sort != null && !sort.isBlank()) {
            String[] sortParts = sort.split(",");

            String field = sortParts[0].trim();

            Sort.Direction direction =
                    Sort.Direction.ASC;

            if (sortParts.length > 1) {
                try {
                    direction =
                            Sort.Direction.fromString(
                                    sortParts[1].trim()
                            );
                } catch (IllegalArgumentException ignored) {
                    direction = Sort.Direction.ASC;
                }
            }

            if ("time".equals(field)) {
                pageSort = Sort.by(
                        direction,
                        "time"
                ).and(
                        Sort.by(
                                direction,
                                "id"
                        )
                );
            } else if ("id".equals(field)) {
                pageSort =
                        Sort.by(
                                direction,
                                "id"
                        );
            }
        }

        PageRequest pageable =
                pageSort.isSorted()
                        ? PageRequest.of(
                                page,
                                size,
                                pageSort
                        )
                        : PageRequest.of(
                                page,
                                size
                        );

        Page<SensorDataResponse> pageData =
                sensorDataService
                        .getSensorData(
                                sensorType,
                                value,
                                time,
                                pageable
                        )
                        .map(
                                SensorDataResponse::from
                        );

        PageResponse<SensorDataResponse> response =
                new PageResponse<>(
                        pageData.getContent(),
                        pageData.getTotalPages(),
                        pageData.getTotalElements(),
                        pageData.getSize(),
                        pageData.getNumber(),
                        pageData.isFirst(),
                        pageData.isLast()
                );

        return ResponseEntity.ok(response);
    }
}