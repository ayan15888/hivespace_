package com.project.hiveSpace.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SprintRequest {
    private String name;
    private String goal;
    private Date startDate;
    private Date endDate;
}
