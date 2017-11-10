# DatePicker component for Vaadin Flow

This project is the Component wrapper implementation of [`<vaadin-date-picker>`](https://github.com/vaadin/vaadin-date-picker) element
for use from the server side with [Vaadin Flow](https://github.com/vaadin/flow).

## Running the component demo
Run from the command line:
- `mvn clean install`
- `mvn exec:java -Dexec.mainClass="com.vaadin.ui.datepicker.DatePickerView" -Dexec.classpathScope="test"`

Then navigate to `http://localhost:9998`

## Using the component in a Flow application
To use the component in an application using maven, 
add the following dependency to your `pom.xml`:
```
<dependency>
    <groupId>com.vaadin</groupId>
    <artifactId>vaadin-date-picker-flow</artifactId>
    <version>${component.version}</version>
</dependency>
```
Right now the usage requires the component to be locally built and installed through `mvn install`

## Flow documentation
Documentation for flow can be found in [Flow documentation](https://github.com/vaadin/flow/blob/master/flow-documentation/Overview.asciidoc).

## Contributing
- Use the coding conventions from [Flow coding conventions](https://github.com/vaadin/flow/tree/master/eclipse)
- [Submit a pull request](https://www.digitalocean.com/community/tutorials/how-to-create-a-pull-request-on-github) with detailed title and description
- Wait for response from one of Vaadin Flow team members

## License
Apache License 2.0
