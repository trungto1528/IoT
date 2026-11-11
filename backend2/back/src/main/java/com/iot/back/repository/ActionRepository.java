package com.iot.back.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.iot.back.entity.Action;

public interface ActionRepository
        extends JpaRepository<Action, Integer>,
                JpaSpecificationExecutor<Action> {
}