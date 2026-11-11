package com.iot.back.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.iot.back.entity.Device;

public interface DeviceRepository extends JpaRepository<Device, Integer> {

    // Tìm thiết bị theo số hiệu (1, 2, 3...)
    Optional<Device> findByDeviceNumber(Integer deviceNumber);

    // Kiểm tra xem số hiệu thiết bị đã tồn tại chưa (dùng khi thêm LED mới)
    boolean existsByDeviceNumber(Integer deviceNumber);
}